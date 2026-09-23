# Compositor de piezas con CTA — Composición y certificación

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-23 por Claude
> **Ultima actualizacion:** 2026-09-23 por Claude
> **Documentacion tecnica:** [Compositor de CTA — comando canónico](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) (§14 guarda de sujeto · §15 red de seguridad · §16 accesibilidad · §17 variantes · §18 certificación y tramos)
> **Manual de uso:** [Compositor de piezas con CTA — manual de uso](../../manual-de-uso/creative/compositor-piezas-cta.md)
> **Regla creativa que implementa:** [Tres voces + acción](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md)

## Qué es

Una pieza publicitaria con CTA tiene tres capas: una fotografía, una idea escrita en varias voces y una acción
concreta, el **CTA** (del inglés *call to action*: «Agenda tu discovery», «Compárate con ellos»). El compositor pone
las dos últimas capas sobre la primera y **mide el resultado sobre la imagen real, píxel por píxel**, no sobre la
paleta teórica.

Funciona con dos comandos que van en pareja:

| Comando | Qué hace | En palabras simples |
|---|---|---|
| `pnpm foto:componer:cta` | Compone: escribe cada voz, dibuja el CTA y su selección, pone la firma y mide todo | el diseñador que arma la pieza |
| `pnpm foto:cta:gate` | Certifica: revisa lo compuesto contra las reglas y entrega un veredicto | el revisor que firma el visto bueno |

Parte de dos insumos:

- una **foto limpia**, el *plate*: sin texto ni logo y con espacio reservado para el texto;
- un **plan**: un archivo que describe, pieza por pieza, qué dice cada voz, qué tratamiento lleva el CTA y cómo se
  firma.

**Lo que no hace:** no publica, no programa y no aprueba campañas. **Certifica la pieza, no la campaña.** Una pieza
certificada todavía necesita la mirada de una persona, los derechos de la imagen y la decisión de publicarla.

> Detalle técnico: compositor en [`scripts/foto/componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs); gate en
> [`scripts/foto/componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs); contrato §1–§3 de
> [EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md). Los agentes lo
> operan con la skill [`efeonce-advertising-creative`](../../../.claude/skills/efeonce-advertising-creative/SKILL.md).

## El recorrido de una pieza

1. **Foto limpia.** Se produce el plate reservando el espacio del texto y se valida con números antes de componer
   (`pnpm foto:prompt` con la reserva `zona-texto`, y `pnpm foto:validar <plate> --zona-texto`).
2. **Plan.** Se describe cada pieza en un archivo JSON. Un plan mal escrito falla antes de tocar un píxel.
3. **Composición.** `pnpm foto:componer:cta` dibuja cada pieza, la mide y deja todo en la carpeta `out/` junto al plan.
4. **Certificación.** `pnpm foto:cta:gate` comprueba que lo entregado es lo que se compuso y que cumple el canon.
5. **Revisión humana.** Una persona mira la pieza a tamaño completo y como se ve en un teléfono. El gate no
   reemplaza esa mirada: dice si se cumplen las reglas medibles, no si la pieza es buena.

> Detalle técnico: preparación del plate en
> [EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md](../../operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md)
> y [EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md](../../operations/brand-photography/EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md);
> validador en [`scripts/foto/validar-reservas.mjs`](../../../scripts/foto/validar-reservas.mjs).

## Qué entrega

Todo queda en la carpeta `out/`, al lado del plan:

| Archivo | Qué es |
|---|---|
| `<id>.png` | La pieza terminada, al tamaño del plate o al tamaño `final` que pida el plan |
| `preview-390/<id>.png` | La misma pieza a 390 px de ancho: como se ve en el feed de un teléfono |
| `<id>.alt.txt` | El texto alternativo para lectores de pantalla |
| `<id>-layout.json` | Dónde quedó cada caja: voces, CTA, selección y firma. El gate vuelve a revisar la maquetación desde aquí |
| `<id>-overlay.svg`, `<id>-controls.svg`, `<id>-cta-evidence.json` | Capas y evidencia técnica de la selección y del CTA |
| `qa-<nombre-del-plan>.json` | El **registro de calidad** del plan: todas las mediciones de cada pieza y sus huellas |

Tres propiedades que conviene conocer:

- **Cada plan tiene su propio registro.** Si en una carpeta hay dos planes, cada uno tiene su `qa-<plan>.json` y no se
  pisan. El `out/qa.json` compartido es el formato anterior: todavía se lee, pero ya no certifica.
- **Nada queda a medias.** Los archivos de una pieza se escriben juntos, al final y sólo si la pieza pasó todas sus
  comprobaciones. El registro se actualiza después de sus archivos. Una pieza que aborta no deja nada.
- **Una composición completa empieza con el registro vacío; una parcial** (sólo algunas piezas) **lo completa** y
  conserva las demás.

> Detalle técnico: escritura atómica, registro por plan y huellas en
> [`scripts/foto/cta-integridad.mjs`](../../../scripts/foto/cta-integridad.mjs); contrato §18, tramo 1.

## Las voces de una pieza

El texto de una pieza se organiza en **voces**, cada una con una función:

| Voz | Campo del plan | Para qué está |
|---|---|---|
| Etiqueta (opcional) | `label` | Una marca breve sobre el bloque de texto |
| Entrada | `lead` | Abre la idea |
| Titular o dominante | `dominant` | La idea principal. Siempre es la voz más grande |
| Remate o cierre | `after` | Cierra la idea y completa el concepto |
| Nota o beneficio (opcional) | `note` | Lo que gana quien actúa |
| CTA | `cta.text` | La acción concreta |
| Descriptor | `cta.descriptor` | Lo que recibe quien hace clic, en palabras del comprador; nunca el nombre interno del servicio |

Reglas que el gate hace cumplir:

- **Concepto completo.** Entrada, dominante y cierre. Si falta la entrada o el cierre, el gate lo bloquea, salvo que el
  plan declare un **concepto reducido** con su razón y un aprobador registrado. El exceso de texto se resuelve
  acortando cada voz, no quitando voces.
- **Regla de las tres veces.** El dominante mide al menos tres veces la entrada. Por debajo, la jerarquía se aplana.
- **El dominante es la voz mayor.** Ninguna otra voz —entrada, cierre, nota, CTA o descriptor— puede ser más grande que
  el titular.

Dentro del texto se pueden usar tres marcas: `**negrita**` sube el peso dentro de la misma familia, `[[acento]]` pinta
la palabra en el naranja de Efeonce y una barra vertical (`|`) fuerza un salto de línea. El compositor además evita las
**viudas** (una palabra sola en la última línea) y las líneas que terminan en artículo, preposición o conjunción, sin
cambiar el número de líneas del bloque.

Las familias tipográficas siguen la regla Tres voces + acción: **Bricolage** instala la idea (el titular y, si el plan
lo pide, la entrada o el cierre), **Poppins** estructura y actúa (CTA, descriptor, nota) y **Guttery** queda para el gesto
manuscrito opcional, que hoy está fuera de la certificación.

> Detalle técnico: regla creativa en [Tres voces + acción](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md)
> (§Jerarquía y §«El concepto completo no es opcional»); cortes de línea en el contrato §15; descriptor en §9.

## Lo que el compositor garantiza sin que nadie lo pida

Estas protecciones no dependen de que el plan las declare:

| Garantía | Qué significa |
|---|---|
| El texto no tapa a nadie | Segmenta la foto y aborta si una voz, el CTA o un cursor toca a la persona o al protagonista |
| Un plan mal escrito falla antes | Revisa tipos, rangos y combinaciones antes de componer; el error nombra la pieza y el campo |
| Letras que la fuente no tiene | Un emoji o una letra hebrea salían como cuadros vacíos; ahora el plan falla nombrando el campo y el carácter |
| Nada a medias | Una pieza que aborta no deja archivos nuevos ni un registro que apunte a otra imagen |
| Sin mezclas | Dos composiciones no pueden usar la misma carpeta a la vez. Si interrumpes una con Ctrl-C, la carpeta queda libre |
| Aviso entre planes | Si otro plan de la misma carpeta ya registra un id que vas a componer, avisa antes de empezar |
| Determinismo | La misma pieza compuesta dos veces sale idéntica al píxel |
| Crecer con aire | En 16:9 y 9:16 el texto crece sólo mientras respira, se lee y queda dentro de su zona |

**Por qué importa el aviso entre planes.** Los archivos de una pieza se nombran por su id. Si dos planes de la misma
carpeta comparten un id (pasó en `aeo-cta-v04`: dos planes compartían ocho), componer uno reemplaza el PNG que había
certificado el otro, y el gate del otro plan empieza a fallar hasta que se recomponga.

> Detalle técnico: validación con el esquema declarativo [`scripts/foto/cta-esquema.mjs`](../../../scripts/foto/cta-esquema.mjs)
> y cobertura de glifos en el compositor; bloqueo por carpeta `tomarBloqueo` en
> [`cta-integridad.mjs`](../../../scripts/foto/cta-integridad.mjs); contrato §15 y §18 (tramos 1, 3, 8 y 9).

## Los veredictos: certificado, falla y no certificable

El gate termina siempre con uno de cuatro resultados:

| Resultado | Código | Qué significa |
|---|---|---|
| ✓ **Certificado** | 0 | Las huellas calzan (plan, plate, PNG, layout y comando vigente) y cada pieza cumple todas las reglas del canon |
| ✗ **Falla** | 1 | Una pieza incumple una regla, o algo cambió después de componer (el plan, el plate, el PNG o el layout) |
| Uso incorrecto | 2 | Se llamó al gate sin plan |
| ⊘ **No certificable** | 3 | No es un aprobado ni un reprobado: el gate no tiene cómo probar lo que certificaría |

**«No certificable» no es un pase.** Quiere decir «no puedo probarlo». Aparece cuando:

- el registro de calidad es del **formato anterior** (`out/qa.json` compartido, sin huellas ni medición del trazo);
- la pieza se compuso con **otra versión del comando**, por ejemplo antes de actualizar el repositorio;
- la silueta del sujeto salió de una **caché ajena** al repositorio, o no dice de dónde salió;
- la pieza lleva **gesto manuscrito o tarjeta**, elementos que ninguna guarda mide.

Las fallas tienen prioridad: si hay alguna, el resultado es 1. El 3 sólo aparece cuando todo lo que se pudo verificar
está bien. Se resuelve recomponiendo o certificando por reproducción (más abajo). El gesto y la tarjeta no tienen
salida hoy: el gesto manuscrito quedó fuera de alcance por decisión del operador (2026-09-23).

**Por qué existe el 3.** Antes, todos estos casos salían con 0 y «✓». Una auditoría encontró que así se habían
certificado 18 piezas de la campaña `cmp002-hubspot` sin una sola medición de accesibilidad, entre ellas KV-07-916, que
el compositor vigente rechaza porque el texto tapa a la persona.

> Detalle técnico: códigos de salida al final de
> [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs); contrato §18, tramo 6.

## Cómo sabe el gate que la pieza es la que dice ser

Una **huella** es un código (sha256) que identifica un contenido: si cambia un solo byte, la huella cambia. Cada pieza
del registro guarda cinco, y el gate las **vuelve a calcular**:

| Huella de… | Qué cubre | Si no calza |
|---|---|---|
| la pieza | su definición en el plan (reordenar los campos no la cambia) | falla: el plan cambió después de componer |
| el plate | la foto | falla: la foto cambió |
| el PNG | la imagen entregada | falla: no es la imagen que se compuso |
| el layout | el mapa de cajas | falla: la maquetación no es la registrada |
| el comando | el código del compositor y sus módulos, las versiones de sus paquetes, las fuentes (Bricolage y Poppins), los logos y la firma web | no certificable: se compuso con otra versión |

Ninguna fecha de archivo decide nada. Antes el gate comparaba fechas y llegó a certificar piezas de otro plan y
registros viejos después de cambiar la foto. Además, el PNG entregado tiene que medir lo que pide el plan (`final`) o,
sin `final`, lo mismo que el plate.

**Consecuencia práctica:** cada vez que el comando cambia —una mejora del código, una actualización de paquetes, una
fuente o un logo nuevo—, las piezas compuestas antes pasan a «no certificable» hasta recomponerlas o reproducirlas.

### Certificación por reproducción

`pnpm foto:cta:gate <plan> --reproducir` es la certificación que no se puede falsificar. Vuelve a componer el plan en
una carpeta temporal con el comando vigente y una segmentación nueva, exige que cada PNG y cada layout entregado sea
**idéntico byte a byte** al reproducido, y entrega el veredicto sobre el registro reproducido. Funciona porque el
compositor es determinista (lo demuestra la prueba P01): si la pieza entregada es la que produce el comando de hoy, se
certifica sin tocarla; si no, hay que recomponer.

> Detalle técnico: `huellaPieza` y `huellaComando` en [`cta-integridad.mjs`](../../../scripts/foto/cta-integridad.mjs);
> reproducción al inicio de [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs); contrato §18, tramos
> 1, 6, 8 y 9.

## Cómo se protege a las personas de la foto

Antes de componer, el compositor separa en la foto al protagonista del fondo con un modelo de segmentación que corre
en el propio computador, sin costo por uso. El resultado es una silueta, la **máscara**. Cuenta como sujeto lo que la
foto muestra como protagonista: personas, mascotas, personajes (Clawd, Codex, Gigi) y el objeto que sostienen o
protagonizan, como una tablet, un monitor en la mano o un pedestal.

Con esa silueta se aplican dos distancias, medidas como fracción del lado corto de la imagen:

| Regla | Distancia | Cuándo actúa |
|---|---|---|
| **No tapar** | 1,2 % | Siempre, a cualquier tamaño. Si una caja toca al sujeto, la pieza aborta nombrando la caja |
| **Crecer respirando** | 3,5 % | Sólo mientras el texto crece: crece únicamente si mantiene este aire |

Se mide la distancia real al borde de cada caja, no un rectángulo inflado. Se protegen todas las voces, el CTA, el
descriptor, el grupo del CTA con su cursor y los cursores de la selección. El 3,5 % se calibró contra 30 piezas
aprobadas: con 1,2 % el texto «pasaba» rozando la cabeza de un personaje, y no tapar no basta, hay que respirar.

**Sin silueta no hay certificación.** Si la segmentación no corre, la pieza no crece y el gate la rechaza. Declarar a
mano una altura (`subjectProtection`) protege una franja horizontal, no la silueta: sigue siendo válido como dato, pero
ya no alcanza para certificar.

**La silueta se verifica.** Se guarda en una caché por huella del plate, con sus datos de origen (plate, modelo,
versión, tamaño y huella de la propia máscara), y se revisan al leerla: si algo no calza, se vuelve a calcular. El
registro anota de dónde salió: `fresca`, `cache-canonica` (la del repositorio) o `cache-externa` (una carpeta ajena, que
no certifica). Si la máscara no marca nada en una foto que tiene protagonista, el gate lo avisa.

**Objetos que no son el sujeto pero no se tapan.** El plan puede declarar zonas protegidas (`protect`), cada una con su
razón: el canto iluminado de un monitor, un producto. El texto que las toca descarta ese tamaño al crecer y, a tamaño
final, aborta.

**Falsos positivos.** Si la segmentación marca como sujeto algo que no lo es (un afiche del fondo), el plan puede
ignorar esa zona (`subjectGuard.ignore`), siempre con razón y con un aprobador del registro. Cada zona puede cubrir como
máximo el 10 % de la imagen y todas juntas el 15 %: la guarda nunca se apaga entera.

> Detalle técnico: `subjectMask` y `guardHits` en [`componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs) (modelo
> `@imgly/background-removal-node`, calidad `medium`; caché en `node_modules/.cache/foto-sujeto/`); límites de zonas
> ignoradas en [`cta-esquema.mjs`](../../../scripts/foto/cta-esquema.mjs); contrato §11, §14 y §18 (tramos 1, 2 y 6).

## El texto crece en formatos anchos y altos, pero sólo si respira

En un 16:9 la columna de texto mide casi lo mismo que en un 4:5, pero ocupa un lienzo mucho más ancho, y el texto se
ve perdido. Por eso, en formatos **horizontales** (16:9) y **verticales altos** (9:16), el compositor agranda todo el
bloque con un mismo factor, hasta que el titular llene su ancho máximo (`dominantMax`), con un tope de 1,6 veces. Como
todas las voces crecen igual, la jerarquía no cambia. El 4:5 y el 1:1 no crecen.

El crecimiento se detiene ante la primera de estas condiciones, todas medidas:

- el texto quedaría a menos de 3,5 % del sujeto;
- alguna voz perdería contraste: en el trazo se exige 1,1 veces el umbral, o lo que la voz ya tenía a tamaño original;
- algo saldría de la zona segura o de la reserva editorial, tocaría una zona protegida o chocaría con otro elemento.

Sin silueta no se crece: la ausencia de prueba no es permiso. Una pieza ya aprobada se puede recomponer sin que crezca
con `textGrowth: false`. Ninguna excepción hace crecer más una pieza.

> Detalle técnico: búsqueda del factor al final de [`componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs)
> (`GROW_CAP = 1.6`, `MARGEN_CRECER = 1.1`); contrato §13, §14 y §18 (tramos 2, 3 y 7).

## Dos cánones: las piezas aprobadas y las nuevas

Desde el 2026-09-23 conviven dos juegos de reglas. Las **132 piezas aprobadas** hasta ese día siguen con las reglas de
antes y componen exactamente igual: están en un registro (`scripts/foto/canon-anterior.json`) que las reconoce por la
huella de su foto y de su definición en el plan. **Toda pieza nueva —o una aprobada que se edita— sigue el canon
2026-09-23**, que agrega: la zona segura de AXIS por defecto, la firma de 25 % en los horizontales y siempre en el
cuarto inferior, el orden de lectura, la jerarquía por rol y el aire mínimo del botón. Nadie elige el canon: el gate lo
recalcula del registro. Ninguna imagen ya hecha se regenera por este cambio.

> Detalle técnico: `canonDe` en [`cta-integridad.mjs`](../../../scripts/foto/cta-integridad.mjs); contrato §18
> (tramo 11).

## La zona segura

Es el área donde el texto no queda bajo la interfaz de la plataforma (botones, nombre de la cuenta, barra de
respuesta). Los valores salen del contrato de diseño AXIS:

| Perfil | Formatos | A los lados | Arriba y abajo |
|---|---|---|---|
| Feed | 4:5, 1:1 y 16:9 | 7,5 % | 6 % |
| Story | 9:16 (alto ÷ ancho ≥ 1,7) | 10 % | 13 % |

- **La zona de AXIS es el piso.** El plan puede estrecharla con su propia zona, nunca ampliarla. Texto, CTA, selección
  y firma fuera de ella bloquean el gate, salvo excepción auditada.
- **En una pieza nueva, la zona de AXIS es la de por defecto**: el texto arranca dentro por el costado y también por
  arriba sin declararla. Las aprobadas conservan el margen de 7 % con que se hicieron.
- **El texto crece dentro de la zona:** en una pieza nueva, el marco del CTA que no se pinta ya no frena el crecimiento
  (el 16:9 pasa de ×1 a ×1,6).
- **La firma se mide contra su propia franja**: la zona de AXIS estrechada por la franja que el plan declara para la
  firma (`signatureSafeArea`), no contra la zona del texto.

> Detalle técnico: `zonaAxis`, `zonaEfectiva` y `zonaFirma` en [`componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs);
> contrato §18 (tramo 4 y seguimiento de la firma externa).

## La firma

Toda pieza declara cómo se firma. Hay tres modos:

| Modo | Cómo se declara | Quién pone la firma |
|---|---|---|
| Logo | `logo: { width: 0.2, x: 0.5, y: "auto" }` (`0.25` en un horizontal nuevo) | El compositor |
| Externa | `firma: { modo: "externa", razon }` (o `signatureY`, la forma que usan los planes v05–v07); en una pieza nueva, con aprobador y plate | Otra herramienta, después del compositor |
| Sin firma | `firma: { modo: "sin-firma", razon, aprobadoPor, plate }` | Nadie; exige un aprobador del registro |

Reglas del canon, que el gate hace cumplir:

- **Tamaño:** al menos el 20 % del lado corto de la imagen; en una pieza nueva, 25 % en los formatos horizontales y
  como máximo 35 % en todos.
- **Lugar** (piezas nuevas): debajo de todo el contenido, en el cuarto inferior de la pieza y fuera de las zonas
  protegidas.
- **Contraste:** al menos 4,5:1 contra su fondo. En el logo se mide la caja y también el **trazo** (el 1 % de píxeles
  más débiles del logotipo, igual que en las voces).
- **Nunca sobre el sujeto.**
- **Búsqueda automática** (`y: "auto"`): busca, desde el pie hacia arriba y **sólo en la banda del pie** —debajo de todo
  lo compuesto—, la primera altura que cumpla contraste en la caja y en el trazo, lejos del sujeto y sin chocar con
  nada. Si no encuentra, la firma queda al pie y el gate la mide ahí. Antes subía sin tope y llegó a dejar la firma
  encima del titular.
- **Tinta automática** (`logo.variant: "auto"`): elige el logo blanco o el navy midiendo el fondo donde va la firma.

**Firma externa.** En los sets v03–v07 la firma la pone otra herramienta después de componer. El compositor no la
dibuja, pero sabe dónde va a caer: reserva su caja con la misma geometría de esa herramienta (20 % del lado corto,
centrada, con su centro vertical en 0,935 de la altura si el plan no dice otra cosa), impide que algo caiga ahí y mide
su contraste como lo hace esa herramienta: el peor píxel de la caja con la mejor de las dos tintas oficiales. El gate le
exige lo mismo que al logo —contraste, tamaño, zona y que no caiga sobre el sujeto—, salvo el trazo, porque esa firma
todavía no existe cuando se certifica.

Lo que se certifica en ese caso es **la pieza sin firma y el lugar donde irá**. Las herramientas de firma de v03–v07
reemplazan `out/<id>.png` por la versión firmada, así que la certificación se hace antes de firmar.

**Decidido el 2026-09-23 — la firma en 16:9:** 25 % del lado corto en las piezas nuevas; las ya hechas no se
regeneran. El dato que llevó a la decisión: medido en una misma campaña, en 16:9 la firma ocupa entre 7,3 % y 7,9 %
del ancho del cuadro, contra 20 % en 4:5 y 9:16 (18 % en 1:1). En el feed de un teléfono mide 31 px contra 78 px en el
4:5: dos veces y media más chica. Hay dos causas. Las piezas 16:9 de CMP-002 y del registro C se hicieron con 13–14 % del
lado corto, bajo el canon (el gate ya lo bloquea y se corrigen al recomponer). Y aun con el canon, el 20 % del lado corto
en 16:9 es 11 % del ancho y 44 px en el teléfono. La opción recomendada, que el operador todavía no decide, es 25 % del
lado corto en formatos horizontales (cerca de 14 % del ancho y 55 px en el teléfono, la misma relación firma/titular del
4:5) y 20 % en verticales y cuadrados. Si se aprueba, cambian el gate, el compositor y la herramienta de firma externa.

> Detalle técnico: `cajaLogo`, `buscarYFirma`, `cajaFirmaExterna` y `contrasteFirmaExterna` en
> [`componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs); reglas de firma en
> [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs); contrato §6 y §18 (tramos 4 y 6, y seguimiento
> de la firma externa).

## Accesibilidad

La regla de aprobación es **WCAG 2.2 AA**, el estándar internacional de accesibilidad web. Además se usan dos
comprobaciones de respaldo: **APCA**, una medida de contraste más cercana a la percepción, y la **simulación de
daltonismo**. Estas dos bloquean sólo en el CTA; en las demás voces avisan.

### El tamaño que importa es el del teléfono

Las piezas se ven sobre todo en el feed de un teléfono, que las muestra a unos **390 px CSS de ancho**. Por eso cada
tamaño de letra se traduce a cómo se ve ahí: px en la imagen × 390 ÷ ancho de la imagen. Un texto que en el archivo
parece grande puede quedar diminuto en el teléfono, sobre todo en 16:9: en la primera medición, 43 de 86 descriptores
quedaban bajo 9 px en pantalla, con un mínimo de 3,8 px.

Con ese tamaño se decide el umbral de WCAG:

| Texto | Mínimo |
|---|---|
| Normal | 4,5:1 |
| Grande: desde 24 px CSS, o desde 18,66 px CSS en negrita | 3:1 |
| Límites que no son texto: borde o relleno del CTA contra la foto | 3:1 |

### Se mide el trazo, no la caja

El contraste se mide sobre cada píxel de letra contra el fondo que tiene justo detrás, y se exige que **el 1 % más
débil** cumpla el umbral. Medir la caja completa promedia zonas oscuras y claras: en un caso real, la caja de «+ AEO»
daba 4,53:1 y el 1 % peor de sus letras, entre 2,4 y 3,1:1, sobre el canto iluminado de un monitor. El gate bloquea con
el trazo; la caja queda registrada para comparar.

### Reglas propias del CTA

- **4,5:1 siempre.** El CTA y el descriptor exigen 4,5:1 aunque sean grandes: no se usa la excepción de texto grande
  para rescatar una combinación débil.
- **Borde y relleno a 3:1** contra la escena.
- **El borde del contorno, como se ve en el teléfono:** al menos 1 px CSS de grosor y 3:1, medido en la pieza reducida a
  390 px con densidad de pantalla 2. Un borde de 2 px en una imagen de 1920 medía 0,4 px CSS y se mezclaba con la foto.
- **APCA y daltonismo bloquean en el CTA** —en el texto, el borde y el relleno— por decisión del operador
  (2026-09-23): la acción tiene que leerse también con la visión y la pantalla más desfavorables. Se exceptúa sólo con
  aprobador (`cta-perceptual`).

APCA usa los umbrales del nivel Bronze: Lc 45 para texto de más de 36 px, Lc 75 para texto corrido de más de dos
líneas y Lc 60 para el resto. El daltonismo se simula con protanopía, deuteranopía y tritanopía (modelo de Machado,
Oliveira y Fernandes, 2009). Un ejemplo de por qué importa: el CTA naranja con protanopía caía a cerca de 3,6:1 aunque
en visión típica pasara.

### Lo que se muestra como aviso

Estos casos no bloquean, pero el gate los muestra para que alguien los mire:

- APCA o daltonismo bajos en voces que no son el CTA.
- Texto de menos de 9 px CSS en el teléfono. El piso de legibilidad por rol está pendiente de decisión.
- Una variante del CTA elegida **sin margen**: pasa por poco y puede no alcanzar en otra pantalla o con compresión.
- Los **corchetes** del CTA de texto: el trazo que dibuja AXIS mide cerca de 0,69 px CSS en un teléfono en todos los
  formatos. Es un valor del contrato AXIS; cambiarlo es decisión del operador.
- Un `placement` declarado (ver abajo).

**`placement` sólo endurece.** El plan puede declarar que la pieza se publica en una pantalla distinta
(`placement: { anchoCssPx, razon }`), pero el ancho que se usa para medir es el menor entre 390 y el declarado. Una
pantalla más grande ya no afloja nada, porque la misma pieza también se ve en un teléfono. Antes, declarar 1600 px bajaba
el mínimo de 4,5 a 3:1.

El comando `pnpm foto:accesibilidad <plan>` arma un reporte para **mirar**: una tabla por pieza y por voz, y la pieza a
390 px vista con cada tipo de daltonismo. No aprueba nada: el que decide es el gate.

> Detalle técnico: módulo puro [`scripts/foto/accesibilidad.mjs`](../../../scripts/foto/accesibilidad.mjs) (WCAG 2.2,
> APCA-W3 0.1.9, Machado 2009; umbrales desde `axisAdvertising.accessibility`), probado con
> [`accesibilidad.test.mjs`](../../../scripts/foto/accesibilidad.test.mjs); reporte en
> [`accesibilidad-reporte.mjs`](../../../scripts/foto/accesibilidad-reporte.mjs); contrato §16 y §18 (tramos 2 y 7).

## El CTA: tres tratamientos y un acento obligatorio

| Tratamiento | Valor en el plan | Intención (`prominencia`) | Cuándo sirve |
|---|---|---|---|
| Texto | `text` | `discreta` | El fondo y la jerarquía ya permiten distinguir la acción |
| Contorno | `outline` | `delimitada` | Delimitar la acción dejando ver la foto |
| Relleno | `solid` | `destacada` | Separar con más claridad la zona de acción |

Ninguno gana por defecto ni tiene un rendimiento demostrado. Se elige por composición y el plan registra el motivo
(`cta.variantReason`; si falta, el compositor avisa), o se deja decidir a la medición con `variant: "auto"`:

- El autor declara la intención (`prominencia`; si no la declara, se asume `delimitada`) y la medición decide si la foto
  la permite.
- Si no la permite, **escala** a un tratamiento que separa más, nunca a uno menos visible. En contorno, antes de pasar
  al relleno prueba la tinta blanca con el acento en el borde.
- Un tratamiento es viable si su texto se lee con margen —4,5:1 multiplicado por 1,1 y ningún píxel bajo el umbral; en
  el relleno, la tinta cumple 4,5:1 sobre el relleno y el relleno se separa de la foto con margen— y además pasa APCA y
  daltonismo.
- Si ninguno alcanza con margen, queda el que más separa, y el gate avisa que se eligió sin margen.
- La decisión se toma una vez, a tamaño original, y el motivo queda en el registro.

Para comparar a ojo, `pnpm foto:componer:cta <plan> --variantes` compone cada pieza en los tres tratamientos y arma una
hoja comparativa a 390 px con la medición de cada uno. No toca el registro del plan.

**El acento es obligatorio.** El canon dice «color a demanda»: eso elige cuál color, nunca si hay color. Quien porta el
acento cambia según el tratamiento: el relleno en `solid`, el borde en `outline` y la tinta en `text`. Los colores de
acento válidos son el naranja (`accentSurface`), la lima (`growthOnDark`) y el naranja oscuro para fondos claros
(`accentInkOnLight`); si el plan no declara ninguno, el compositor usa lima. Si el acento no alcanza el contraste, se regenera el plate: no se cambia de tratamiento
para esquivar la medición ni se apaga el color.

**Corchetes sólo en texto.** En contorno y relleno el rectángulo ya delimita la acción y no lleva corchetes; en texto se
conservan porque sin ellos el CTA queda huérfano. El cursor se conserva en los tres (decisión del operador,
2026-09-23).

**La columna.** Con el bloque alineado a la izquierda, `cta.x: "columna"` hace que el botón (o el texto del CTA)
arranque en la misma columna que las voces, y el descriptor lo sigue; `note.x: "columna"` hace lo mismo con la nota. En
un bloque centrado «columna» no tiene sentido y el plan se rechaza. El gate avisa si el CTA o el descriptor quedan
corridos más de 4 px de la columna.

**La selección no tapa texto.** Ningún cursor, etiqueta ni marco de selección, del titular o del CTA, puede quedar sobre
otra voz.

> Detalle técnico: `elegirVariante` en [`scripts/foto/cta-variantes.mjs`](../../../scripts/foto/cta-variantes.mjs);
> acento por tratamiento en [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs); contrato §10, §12,
> §17 y §18 (tramos 2, 4 y 8).

## Texto alternativo

Para un lector de pantalla, una pieza publicitaria es una **imagen de texto**, así que su alternativa lleva la
descripción de la escena y **todo el texto visible, en orden de lectura** (WCAG 1.1.1 y 1.4.5). Queda en
`out/<id>.alt.txt` y en el registro. Su forma es:

```text
<Descripción de la escena>. Texto en la imagen: «entrada» «titular» «cierre» «nota» Llamado a la acción: «CTA» descriptor Cursores de colaboración: «…» Firma: logotipo de Efeonce
```

Reglas:

- La escena la describe el plan en `altText`, **sin transcribir el copy**: la escena se describe y el texto se
  transcribe aparte. Si `altText` falta, o si transcribe el copy, el gate avisa.
- Se dice «Llamado a la acción», nunca «Botón»: en una imagen no hay un control que se pueda activar, y anunciarlo
  confunde.
- El rol del CTA se anuncia siempre, aunque la escena mencione sus palabras. En v07 las 15 piezas lo perdían.
- Una voz sólo se omite si la escena **la cita entre comillas**. Antes bastaba una coincidencia de palabras: «Ver» se daba
  por dicho en «verde» y «¡mira!» en «una mujer mira».
- Suma todo lo que es texto en la imagen: el encabezado de la tarjeta, el gesto, las etiquetas de los cursores y la
  firma.

> Detalle técnico: `textoAlternativo` y `copiaEnEscena` en [`accesibilidad.mjs`](../../../scripts/foto/accesibilidad.mjs);
> contrato §16 y §18 (tramos 4 y 8).

## Excepciones: cuando una regla no aplica, con nombre y apellido

Hay casos legítimos en que una regla del canon no aplica a una pieza. Para eso existen las **excepciones auditadas**:
exceptúan **una regla en una pieza**. No apagan la medición: el gate la sigue haciendo, e imprime la excepción con su
razón y quién la aprobó, para que cualquiera que revise la vea.

Reglas que se pueden exceptuar:

| Regla | Qué exceptúa |
|---|---|
| `zona-segura` | Algo fuera de la zona segura de AXIS |
| `firma-contraste` | Firma bajo 4,5:1 |
| `firma-tamano` | Firma bajo el 20 % del lado corto |
| `firma-sobre-sujeto` | Firma sobre la silueta |
| `acento-cta` | CTA sin un color de acento válido (el contrato cita el caso de ceder el acento a un personaje como Gigi) |
| `cta-perceptual` | CTA bajo APCA o daltonismo |
| `concepto-completo` | Pieza sin entrada o sin cierre |
| `jerarquia` | Dominante bajo tres veces la entrada |
| `dominante-mayor` | Otra voz más grande que el titular |
| `reserva-editorial` | Texto fuera de la reserva editorial del plan |
| — | El piso de legibilidad por rol todavía sólo avisa: no hay excepción `legibilidad` (un plan que la declara se rechaza) |

**Lo que nunca se exceptúa:** WCAG de cada voz y de su trazo, el CTA o el descriptor bajo 4,5:1, el relleno bajo 3:1,
el borde del CTA en el teléfono, las huellas, la falta de silueta, una firma automática por encima del contenido y los
choques de maquetación.

Una excepción **vale sólo si**:

1. quien la aprueba está en el **registro de aprobadores**;
2. nombra la **huella (sha256) del plate** para el que se aprobó: si el plate se regenera, se vuelve a aprobar;
3. cuando la regla se mide con un número, declara **`hasta`**, el valor que se aprueba (un contraste o un tamaño mínimos,
   o un máximo de píxeles fuera de la zona o sobre el sujeto).

Una excepción que no vale **no apaga nada**: la regla bloquea y el gate explica por qué. Antes, una razón que decía
«2 a 6 px» aprobaba un desborde de 956 × 724 px y cualquier texto servía de aprobador.

**El registro de aprobadores** es `scripts/foto/aprobadores.json`. Hoy tiene a Julio Reyes (`julio-reyes`, operador de
marca y del compositor) y a la suite de pruebas (`suite-pruebas`), que sólo vale para los planes temporales de las
pruebas: fuera del repositorio por su ruta real y con la marca que deja la propia suite. Sumar a alguien es decisión del
operador y queda en un commit; si el registro tiene cambios sin commit, una pieza que usa una aprobación no se
certifica. Un agente nunca inventa un aprobador: si falta, pregunta. Desde el tramo 10, la pieza sin firma, el concepto
reducido y cada zona del sujeto ignorada nombran también el plate aprobado, como las excepciones.

Tres salidas que no se miden también exigen un aprobador del registro, y el gate las imprime: la pieza **sin firma**, el
**concepto reducido** y las **zonas del sujeto ignoradas**.

> Detalle técnico: `bloquea` y `salidaAprobada` en [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs);
> reglas exceptuables en [`cta-esquema.mjs`](../../../scripts/foto/cta-esquema.mjs); registro en
> [`aprobadores.json`](../../../scripts/foto/aprobadores.json); contrato §18 (tramos 4 y 7).

## Cómo se prueba el propio comando

El compositor sostiene decenas de piezas ya aprobadas, y cualquier mejora puede mover una sin que nadie lo note. Por
eso tiene tres redes, que se corren antes de cambiar su código:

### Diez pruebas de punta a punta

`pnpm foto:componer:cta:pruebas` compone piezas reales del repositorio y variantes rotas a propósito, siempre en
carpetas temporales:

| Prueba | Qué comprueba |
|---|---|
| P01 | Determinismo: la misma pieza compuesta dos veces es idéntica al píxel |
| P02 | No regresión: todas las piezas con CTA del repositorio, y el propio arnés de regresión |
| P03 | Guarda de sujeto: el texto nunca toca a una persona |
| P04 | Crecer respira: el texto crecido queda a 3,5 % o más del sujeto, con una medición independiente |
| P05 | Crecer no degrada el contraste de ninguna voz |
| P06 | Zona segura declarada, eje del bloque y firma automática |
| P07 | Un plan mal escrito falla antes de componer, nombrando pieza y campo |
| P08 | Cortes de línea sin viudas ni líneas que terminan en palabra corta |
| P09 | WCAG 2.2 AA por voz, límites del CTA y texto alternativo completo |
| P10 | El gate aprueba lo bueno y rechaza lo incompleto, lo viejo, el CTA sin acento y la voz bajo WCAG |

Las pruebas que miden no usan el código que prueban: P04 recalcula la distancia al sujeto desde la máscara, P08 trae
su propio criterio de cortes y P09 recalcula el trazo con aritmética propia. Una prueba que se verifica a sí misma no
prueba nada. Al terminar borran sus temporales y dejan sólo el reporte. Estado: 10 de 10 al cerrar el tramo 7.

### Regresión contra la versión anterior

`pnpm foto:componer:cta:regresion` compone **todas las piezas con CTA del repositorio** con dos versiones del
compositor —la de referencia, un commit, y la candidata— y las compara pieza por pieza: si compone o aborta, cada caja,
el registro, el PNG, los avisos y **el veredicto del gate** sobre las dos salidas. La referencia se extrae de git
completa, con todas sus dependencias, para que un cambio en ellas se note. Si cambiaron fuentes, logos o paquetes desde
la referencia, lo avisa, porque esa diferencia no la puede ver.

No se achica en silencio: con cero casos falla, sin su manifiesto de cobertura falla, y una pieza del manifiesto que
falte también falla. Las piezas sin plate en la máquina se cuentan. Al 2026-09-23: 132 piezas únicas, 114 componen y 18
abortan en la referencia, y 84 piezas con CTA no tienen plate en la máquina del operador (las imágenes no se guardan en
el repositorio).

### Mutantes

`pnpm foto:componer:cta:mutantes` rompe a propósito cada guarda —del compositor, del gate, del arnés y de los módulos— y
exige que alguna prueba falle **por la razón esperada**. Una guarda que ningún mutante hace fallar no está probada.
Cada conjunto de pruebas corre primero sin mutante, y un mutante cuenta como detectado sólo si la verificación esperada
cambia respecto de esa corrida base sin tumbar todo lo demás. Dos mutantes **canario** rompen algo ajeno a propósito:
el arnés tiene que reconocerlos como «falla por otra razón»; si los da por detectados, está sobrestimando. Puntuaciones
registradas: 48 de 48 al cerrar el tramo 6, 12 de 12 del tramo 7 y 8 de 8 del tramo 8. Se midieron con el arnés
anterior, que el tramo 9 endureció justamente porque podía sobrestimar. Con el arnés nuevo, al cerrar el tramo 9: 75 de
77 en la corrida completa más los dos canarios bien clasificados; los dos restantes los clasificaba mal el propio
criterio nuevo, se ajustó y, junto con los dos mutantes de los últimos arreglos, dieron 6 de 6.

> Detalle técnico: [`componer-cta.pruebas.mjs`](../../../scripts/foto/componer-cta.pruebas.mjs),
> [`componer-cta.regresion.mjs`](../../../scripts/foto/componer-cta.regresion.mjs) (referencia hermética en
> [`regresion-ref.mjs`](../../../scripts/foto/regresion-ref.mjs); manifiesto
> [`componer-cta.cobertura.json`](../../../scripts/foto/componer-cta.cobertura.json)) y
> [`componer-cta.mutantes.mjs`](../../../scripts/foto/componer-cta.mutantes.mjs); contrato §15 y §18 (tramos 5 y 9).

## Estado y lo que falta

El comando pasó por dos auditorías adversariales (diseño y arquitectura) que buscaron, corriendo y mirando, caminos en
los que el gate daba verde sobre una pieza mala. Cada hallazgo se cerró en un tramo:

| Tramo | Qué cerró |
|---|---|
| 1 · Integridad | Registro por plan con huellas, escritura atómica, bloqueo por carpeta, caché de siluetas verificada, esquema del plan, guarda de sujeto que no se apaga |
| 2 · Contraste real | Medición sobre el trazo, zonas protegidas, borde de al menos 1 px CSS, `auto` con degradación de tinta |
| 3 · Esquema e invariantes | Letras que la fuente no tiene, entidades en las etiquetas, una sola función de reglas de maquetación, reserva editorial |
| 4 · El canon hecho regla | Zona segura de AXIS, contrato de firma, concepto completo, regla de las tres veces, columna, texto alternativo, excepciones |
| 5 · Arnés y pruebas | Referencia hermética, manifiesto de cobertura, avisos comparados, puntuación de mutantes |
| 6 · El gate no miente | Código 3, certificación por reproducción, origen de la silueta, firma automática sólo en el pie |
| 7 · Umbrales que no se aflojan | `placement` sólo endurece, CTA a 4,5:1 siempre, dominante mayor, excepciones con plate, `hasta` y aprobador registrado |
| 8 · Entradas y bordes | Rangos, entidades inválidas, ids que difieren en mayúsculas, plate ilegible, columna sólo a la izquierda, texto alternativo, corchetes medidos, tamaño entregado |
| 9 · Proceso | Bloqueo sin carreras que Ctrl-C suelta, aviso entre planes, suite que limpia sus temporales, veredicto del gate en la regresión, huella con fuentes y logos, mutantes contra una corrida base y canarios |
| 11 · Canon 2026-09-23 | Registro de las piezas aprobadas; en las nuevas, zona AXIS por defecto, firma de 25 % en horizontales y en el cuarto inferior, orden de lectura, jerarquía por rol, aire del botón y firma externa aprobada; sin velo |
| 10 · Integridad (tras la tercera certificación) | Selección sobre un objeto dentro de las guardas, zona de la firma validada y firma dentro de la imagen, aprobador de pruebas sólo en la suite, sin estado interno en el plan, HUD/url/pie no certificables, espacios Unicode, huella del texto alternativo y reproducción que compara todo lo entregado, comando ajeno que no certifica, piso de `final`, jerarquía con tamaños resueltos, aprobaciones atadas al plate |

Entre los tramos 5 y 6 se sumaron la medición de la firma externa, el bloqueo de APCA y daltonismo en el CTA y la zona
`"axis"` también por arriba.

**Lo que falta:**

- La **tercera certificación** (2026-09-23) dio NO CERTIFICA en los dos auditores. El tramo 10 cerró lo de integridad;
  faltan el tramo 11 (canon nuevo: orden de lectura, jerarquía por rol, firma en el pie, velo, tamaño mínimo) y el 12
  (banco de pruebas propio), y después una cuarta certificación. Se da por cerrada con cero hallazgos graves y medios.
- Marcar cada guarda en el código con un mutante por marca.
- Las **decisiones pendientes del operador**: tamaño de la firma en 16:9, margen por defecto del compositor, firma de
  las tres stories de v07 en la franja que Reels tapa, si el velo necesita aprobación, si una variante sin margen debe
  bloquear, el piso de legibilidad por rol y el grosor de los corchetes de AXIS. El
  [manual](../../manual-de-uso/creative/compositor-piezas-cta.md#decisiones-pendientes-que-te-afectan) las detalla.

**El velo ya no existe** (2026-09-23): la sombra que se pintaba encima de la foto para que un texto se leyera se
rechaza al validar el plan. El lugar oscuro donde va el texto o la firma sale del prompt de la foto.

**Decisiones ya tomadas (2026-09-23):** canon nuevo sólo hacia adelante; firma de 25 % en horizontales, abajo y dentro de
AXIS; zona AXIS por defecto; sin velo; APCA y daltonismo bloquean sólo en el CTA; las piezas aprobadas que el canon
reprueba se dejan como están y se corrigen al recomponer; los planes v03–v07 declaran su firma externa; el gesto
manuscrito queda fuera de alcance.

> Detalle técnico: contrato §18 (hallazgos consolidados, estado de los tramos, segunda certificación y decisiones
> pendientes).

## Lo que el gate no ve

El gate mide reglas; no mira la pieza como una persona. Quedan fuera:

- identidad de las personas, dedos, orientación de una tablet, tamaño del lecho y cierre visual de la firma;
- el gesto manuscrito y la tarjeta (por eso esas piezas salen con 3);
- la firma que pone otra herramienta después: se certifica su lugar y su fondo, no la imagen firmada;
- si la pieza funciona: un contraste aprobado no demuestra conversión ni reemplaza la revisión creativa.

> Detalle técnico: límites declarados en el contrato §7 («Cobertura del gate») y §18.

## Documentos relacionados

- [Compositor de piezas con CTA — manual de uso](../../manual-de-uso/creative/compositor-piezas-cta.md): cómo operarlo
  paso a paso.
- [Contrato técnico del compositor](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).
- [Tres voces + acción](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md): la regla creativa.
- [Reglas publicitarias para agentes](reglas-publicitarias-para-agentes.md): cómo Codex y Claude producen piezas con
  texto.
- [Producir una foto de marca Efeonce](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md): cómo se hace el plate.
