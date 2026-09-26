# Julio y Nexa — tres piezas con identidad, 2026-09-20

Prueba de producción del [lenguaje fotográfico aprobado](../../docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md)
con identidad: Julio solo, Nexa sola, ambos juntos. Motor `gpt-image-2.5-sunburst` `high` 1152×1440 (4:5 nativo).
Gasto: 6 imágenes ≈ USD 0,30 (3 de la v1 + 3 de la v2).

Las imágenes son locales y están gitignoreadas; lo versionado son las fichas, los prompts verbatim y este registro.

## Entregables (v2, firmados)

| Pieza (`final-20/`) | Quién | Oficio / mercado | Lente | Lecho | Firma al 20% |
|---|---|---|---|---|---|
| `P1-julio-kv-santiago-v2-logo20.png` | Julio | revisión de pruebas impresas de un KV de café · Santiago | 85 mm f/1,8 | tapa mate negra de flight case · **12,11:1** | blanca **17,85:1** |
| `P2-nexa-retail-cdmx-v2-logo20.png` | Nexa | auditoría de góndola, cuidado personal · CDMX | 35 mm f/4 | carro de reposición acero oscuro · **6,55:1** | blanca **9,44:1** |
| `P3-juntos-taller-miami-v2-logo20.png` | Julio y Nexa | mapa de journey en taller de producción · Miami | 16 mm a ras de mesa | roble claro a ras del lente · **6,01:1** | navy **6,52:1** |

Sombras no azules en las tres (b\* del cuartil oscuro −1,4 / −1,0 / 7,5).

## Por qué hubo una v2: el `ignore their clothing` no alcanza **[medido]**

La v1 de las tres salió con el prompt canónico completo, incluida la frase de §3.7
«ignore their clothing and backgrounds». **El modelo copió igual el vestuario de las referencias**: la referencia
`nexa-the-point.png` muestra a Nexa con blazer navy y blusa blanca, y eso apareció en P2 y en P3 — en P3, sobre
los dos, dentro de una torre con vista a la bahía.

Rompía tres reglas a la vez:

- «azul nunca intermedio en ropa grande» y «la colorimetría no es vestir de navy» ([colorimetría](../../docs/operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md));
- el arquetipo **consultora** que el maestro manda evitar: P3 v1 fallaba el test de sustitución — con el logo de
  otra agencia seguía funcionando igual.

**Con identidad, el vestuario se declara en la escena o lo decide la referencia por nosotros.** La v2 lo declara
en las tres y además saca a P3 de la torre hacia un taller con las herramientas del oficio a la vista.

Cerrado en la entrada: `pnpm foto:prompt` ahora avisa cuando hay identidad y la escena no declara vestuario.

## El otro fallo de la v1: el lecho de P1

P1 v1 midió **1,31:1 en blanco y 1,67:1 en navy** — el lecho era la mesa de luz con las pruebas encima, tono medio
con brillos. Es el fallo ya documentado («la madera de tono medio produjo 6+ fallos»). La v2 lo cambia por la tapa
mate negra de un flight case **con nada encima**, y pasa a 12,11:1. No se parchó: se regeneró.

## Lo que la v1 sí hizo bien y se conservó

Las dos rondas salieron del mismo comando, sin concatenar bloques a mano. La v1 ya traía luz con carácter sobre el
sujeto, momento decisivo, tres planos, acento único e identidad sostenida; lo que falló fue vestuario y lecho, no
la dirección.

## Archivos

- `fichas/*.json` — fichas de toma (v1 y v2). La v2 declara vestuario.
- `prompts/*.txt` — prompts verbatim emitidos por `pnpm foto:prompt`.
- `plates/*.png` — plates limpios (gitignoreados).
- `final/*.png` — plates con la firma oficial compuesta al 15%, centro vertical 0,935.

## Tamaño de la firma: dos poblaciones entre las aprobadas **[medido 2026-09-20]**

El operador notó la firma chica. Medido por diferencia plate↔firmada sobre las piezas que aprobó el 19/09:

| Ronda aprobada | Ancho del logo | Centro vertical |
|---|---|---|
| Personas (J1, J3, JN1, N2…) | **15,0%** | 93,5% |
| Territorios (T1, T1b, T2) | **20,0%** | 94,0% |
| Asiento (A-mesa, B-silla) | **20,0%** | 91,5% |
| Asiento (C2-escritorio) | **20,0%** | 93,4% |

El canon ([firma](../../docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md)) fija **15%** y
afirma que «20% se leía como sello o marca de agua» — pero **hay piezas aprobadas al 20%**, así que esa frase no
describe todo lo aprobado. El default de `scripts/firmar.mjs` es `0.2`; el de `componer.mjs` es `0.15`: el valor
que salía dependía de qué script corrió cada ronda, no de una decisión.

**Resuelto: 20%** **[decisión del operador, 2026-09-20]**, tras comparar las mismas tres piezas a 15% y a 20%.
Los entregables son los de **`final-20/`**; `final/` queda como evidencia de la comparación. El canon de la firma
quedó corregido en su Delta 2026-09-20 (la revisión que tenía abierta se cerró con este valor).

**[pendiente]** Unificar el default de los dos scripts y corregir la frase del canon sobre el 20%, o declarar el
tamaño por tipo de pieza. Hoy el resultado depende del script que se invoque.
