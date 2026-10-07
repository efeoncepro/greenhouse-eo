# Nexa cine: Nano Banana 2.1 frente a Sunburst · 2026-10-06

> **Tipo:** evidencia de prueba interna y lectura visual acotada
> **Estado:** `proof-only`; V2 APROBABLE por cine-reviewer, aprobación visual del operador pendiente
> **Alcance:** dos intentos Nano y comparación con el plate NX7d ya aprobado. Sin publicación ni alta en AXIS.

La prueba confirma que `pnpm ai:nano` puede producir el registro cine de Efeonce con Nexa, ocho referencias,
solicitud 4K y `thinking high`. La V2 conserva identidad, traje y emblema y cumple las reservas medidas.
En la lectura visual de estas dos imágenes, se prefiere **NX7d de GPT Image 2.5 Sunburst para el cine de Efeonce**
por el gesto, la luz y la integración de los Sparks. Nano ofrece más píxeles y un lecho más utilizable.
Esta preferencia no establece un ranking general ni modifica el default OpenAI de la CLI.

## Método y límite de la comparación

Pedido del operador: Nexa, estilo cinematográfico de Efeonce, Nano Banana 2.1, esfuerzo máximo.
Se partió de la receta aprobada `NX7d`, se compiló la ficha con `pnpm foto:prompt` y se revisó antes y después
de generar con cine-reviewer. La generación se hizo por el carril Google directo, manteniendo el estilo portable
del [registro cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) y su
[casebook](../../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md).

**No es un A/B controlado:** NX7d procede de una corrida anterior; el prompt, las referencias de identidad y la
expresión cambiaron. No se ejecutó Sunburst con el prompt y los inputs exactos de Nano. Sus dimensiones,
latencias y costes tampoco permiten un benchmark comparativo de proveedores. El resultado es una lectura de
dos plates concretos, con incertidumbre sobre qué parte del cambio viene del modelo o de la dirección.

Nexa usa ancla frontal v2, expresión de convicción y cuerpo frontal; traje sin rostro, macro de emblema y lentes
por catálogo; dos Sparks con referencia de objeto y tres lejanos sin imagen propia. El núcleo azure/blanco,
el contacto con el hombro, los tres planos y el hangar conservan la idea de la receta.

## Ejecución observada

| Dato                                      | Nano V1                      | Nano V2 seleccionada         |
| ----------------------------------------- | ---------------------------- | ---------------------------- |
| Modelo confirmado en sidecar              | `gemini-nano-banana-2.1`     | `gemini-nano-banana-2.1`     |
| Endpoint / región                         | `generateContent` / `global` | `generateContent` / `global` |
| Solicitud                                 | 4K, 16:9, `thinking high`    | 4K, 16:9, `thinking high`    |
| Referencias / historial / búsqueda        | 8 / 0 / `off`                | 8 / 0 / `off`                |
| Salida nativa                             | PNG, 5504 × 3072             | PNG, 5504 × 3072             |
| Latencia registrada                       | 86,594 s                     | 62,354 s                     |
| Tokens de entrada / salida / razonamiento | 12.468 / 3.844 / 4.086       | 12.559 / 3.780 / 3.124       |
| Tokens totales / cacheados                | 20.398 / 7.983               | 19.463 / 7.985               |
| Componente visual nominal                 | USD 0,0756                   | USD 0,0756                   |

Las dos llamadas fueron generaciones independientes; V2 corrigió la ficha y no editó V1. La cifra nominal sumada
es **USD 0,1512 sólo por imagen de salida**. Entrada y razonamiento tienen alcance adicional; no se ha
conciliado una factura ni se afirma coste total. La menor latencia de V2 es observación de esta corrida.
`high` fue el nivel de esfuerzo elegido; no demuestra que maximice la calidad en cada escena.

El ratio devuelto es aproximadamente 16:9 (5504 / 3072 ≈ 1,7917). Se conservó el PNG nativo sin recorte,
resize, upscale, grade ni retoque. La [CLI](../../manual-de-uso/ai-tooling/nano-banana-2-1-cli.md)
registra las dimensiones reales; no garantiza el ratio matemático solicitado.

## Iteración y QA

V1 sostuvo cara, traje y marca, pero los Sparks del fondo eran demasiado nítidos y no se comprobaban los cinco.
Su lecho blanco midió 2,27:1. Se conservó como descarte, aunque pasaba el chequeo de sombra cine (70,93 %).

En V2 la ficha declara tres Sparks lejanos visibles, mucho menores y desenfocados, y una consola negra mate
en primer plano bajo una cubierta que la aparta físicamente de la llave. Son instrucciones de escena, sin scrim.

Verificación repetida sobre el PNG V2 el 2026-10-06:

| Comprobación                  | Evidencia                                                              |
| ----------------------------- | ---------------------------------------------------------------------- |
| `pnpm foto:validar:cine`      | PASS: 67,11 % del cuadro con L\* < 20; umbral ≥ 35 %                   |
| `pnpm foto:validar`           | 4/4 reservas evaluadas PASS                                            |
| Zona de texto                 | Columna blanca: 0,46 del ancho; reportada sin gate propio              |
| Objeto para enmarcar          | No declarado; no se contó como PASS                                    |
| Lecho de firma                | Blanco 5,32:1 PASS; navy 1,88:1 falla. El medidor advierte señal débil |
| Aire lateral / campo profundo | Calma 0,23 / 0,51; banda continua hasta 0,60                           |
| Color de sombras              | b\* del cuartil oscuro −2,5; PASS                                      |
| Cara y emblema                | Inspección a escala de píxel original; marca contrastada con su macro  |
| Cine-reviewer                 | APROBABLE; quedan reflejos en lentes, con ambas pupilas legibles       |

El medidor de cine no evalúa naturalidad, integración de personajes, luz con relleno ni fidelidad del uniforme
bajo luz azul. Sus indicadores de profundidad y llave son informativos, **no una puntuación de calidad**.
La reserva del lecho es una medición preliminar: una eventual firma blanca debe volver a medirse en su composición
final. Esta prueba no añadió esa capa gráfica ni certifica su contraste final.
APROBABLE permite presentar el resultado; la aprobación del operador, el registro como receta y la publicación
son estados separados. No se añadió una segunda firma sobre el emblema del traje.

## Lectura visual de los dos plates

| Aspecto                  | NX7d · Sunburst                                          | NB21 V2 · Nano                                                 |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------- |
| Sensación de toma        | Momento de una película: gesto y pelo con más movimiento | Retrato promocional de ciencia ficción más frontal y rígido    |
| Fenómeno de luz          | Núcleo, partículas y reflejos conectan la escena         | Haces rectos y limpios, con lectura más gráfica                |
| Nexa                     | Pose y gesto más orgánicos en esta imagen                | Buena identidad y piel; reflejos de lentes más visibles        |
| Sparks                   | Los cercanos comparten mejor el espacio físico con Nexa  | Diseño fiel y cinco visibles; persiste sensación de colocación |
| Espacio para composición | Lecho insuficiente según el precedente del casebook      | Reserva izquierda clara y primer plano oscuro medido           |
| Archivo inspeccionado    | PNG 1792 × 1024                                          | PNG 5504 × 3072                                                |

La preferencia por Sunburst aplica a **la dirección cinematográfica de este caso**. Nano es una alternativa
verificada para explorar la misma ficha cuando pesan la resolución nativa, las reservas y la fidelidad a kits.
Más píxeles y un PASS técnico no resuelven por sí solos la naturalidad de una escena. Para atribuir diferencias
al modelo haría falta una prueba nueva con ficha, prompt, referencias, expresión y condiciones comparables.

## Procedencia verificable

Los archivos locales de la corrida están en `ai-generations/2026-10-06_nexa-nano-banana-21/`.
Su [LEEME](../../../ai-generations/2026-10-06_nexa-nano-banana-21/LEEME.md) y
[evidence.json](../../../ai-generations/2026-10-06_nexa-nano-banana-21/evidence.json) preservan el resumen permitido.
Los hashes siguientes se recalcularon sobre los bytes actuales; no acreditan disponibilidad remota.

| Artefacto                                                                      | SHA-256                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `plates/NB21-NEXA-CINE-v1.png`                                                 | `c1bb715ba44795c5a3f4c60ed3be2d1c96a6a720ef766bd1c45134d9f55cb285` |
| `plates/NB21-NEXA-CINE-v2.png`                                                 | `c9be423c85fdaa95f42a35f145fea959410efbb2fc28b6151110853a6e941b4d` |
| `fichas/NB21-NEXA-CINE-v1.json`                                                | `c15563dc9cddbee2e6794c15c9a660b91e78cf2debf5f9c18ad7fa4abb42c78b` |
| `fichas/NB21-NEXA-CINE.json` (V2)                                              | `a486d0158b568834996e36d7b8fe3eeb1a2e48428d79d5a6aeb222671e52a6be` |
| `prompts/NB21-NEXA-CINE-v1.txt`                                                | `6dbcb929689ffd47c20da9cd7cf82ce0091c50b0eba34cfd4fcaf7ec12fc0018` |
| `prompts/NB21-NEXA-CINE.txt` (V2)                                              | `1aee8b10847ce1d13d97b57edc7e9dc64214715981870265ec42c65b195215fb` |
| Sunburst: `2026-10-01_traje-bionico-nexa/plates/NX7d-nexa-despliega-squad.png` | `c655be94083d73873e6c553751b415f553dfe248e547a41337fb1971a0f0e184` |

### Referencias y adaptación de transporte

Las ocho entradas originales excedían el límite inline de 20 MiB. Las tres de identidad se transportaron como
JPEG quality 98, chroma 4:4:4, **con las mismas dimensiones** y sin recorte ni retoque. Es compresión con pérdida,
no equivalencia de bytes. Las otras cinco mantuvieron sus bytes, incluida la transparencia de los lentes.
Total de transporte: **15.762.412 bytes (15,03 MiB)**. No es una intervención sobre los plates de salida.
Los hashes de fuente y transporte se verificaron para las ocho referencias. El snapshot permitido se registra
aquí; las copias de transporte locales son privadas y no constituyen un archivo remoto publicado.

| Orden / fuente                                                                                      | Dimensiones | SHA-256 fuente                                                     | SHA-256 transporte                                                 |
| --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 1 · `_identidad-nexa/1-anclas/nexa-ancla-1-rostro-frontal-v2.png`                                   | 2560 × 3200 | `2937f1fe3d37383d2e80b74282a8543eb30e161c92c25d98717552ac8a850aa2` | `ebd649958883a3910e2915331a92080a2a65211e6fcec443ddc4411c1f5781a0` |
| 2 · `_identidad-nexa/5-expresiones-frente/nexa-expr-08-conviccion.png`                              | 2048 × 2560 | `72613f246cc9abb8661e7b7bbfe874c6514ce2b19b21c0c80b99db4a9c6bfa0b` | `e27a6505e75649d626b5e105ea287f0d06dfe0df95375ab5d59b5ee89c5ed58d` |
| 3 · `_identidad-nexa/1-anclas/nexa-ancla-5-cuerpo-frontal.png`                                      | 2304 × 3456 | `c152b98b86e58ad50556bc00cebce9cce5cd98a6f4333389a50e6dd077c905f1` | `e6fd44062aaf709d9e31f506c892869957e02a0b8ca15bf6ed2d3d6531e03a99` |
| 4 · Traje, `efeonce-traje-bionico-nexa-13-puesto-frente-sin-rostro-1200x1330-v01-fondo-estudio.png` | 1200 × 1330 | `db9ab79d68cfeece7a28a9c795df1e021e3599d70252d57cc44e3ef0865d416c` | Igual a fuente                                                     |
| 5 · Macro, `efeonce-traje-bionico-nexa-10-detalle-placa-isotipo-1600x1600-v01-fondo-estudio.png`    | 1600 × 1600 | `77314300dfd9b36df54ed9eab8a50d8449c02ee76ec4cfe022ad3839a464b196` | Igual a fuente                                                     |
| 6 · Lentes, `efeonce-lentes-bionicos-nexa-21-tres-cuartos-1600x1600-v01-transparente.png`           | 1600 × 1600 | `524d6398be9ff3ad043595ce88995c7a62c125459415c7d3f62d6aaad57e9944` | Igual a fuente                                                     |
| 7 · AXIS, `spark-reportes-05-cine.png`                                                              | 1024 × 1024 | `0ce19fc8d7576f6aeca52970d44386052da04f4145857ec7b8f4f82a40cf3267` | Igual a fuente                                                     |
| 8 · AXIS, `spark-investigacion-05-cine.png`                                                         | 1024 × 1024 | `94aedf9b8d9ec051012a5491a18887c4e7246c5da30f98617c2fb3541c1801ca` | Igual a fuente                                                     |

Rutas 1–3 relativas a `ai-generations/`; 4–6 en `ai-generations/2026-10-01_traje-bionico-nexa/final/`;
7–8 en `node_modules/@efeoncepro/axis-brand-assets/assets/sparks/`. No se reselló el lock de referencias.
La conservación y recuperación sigue [AI_GENERATIONS_STORAGE_V1](../../operations/AI_GENERATIONS_STORAGE_V1.md):
si falta un archivo, `ai-gen:where` y `ai-gen:pull`; nunca regenerar para sustituir evidencia. Este informe no
confirma que los plates Nano estén archivados en cloud.

## Estado y siguiente decisión

La prueba amplía la evidencia live de la [CLI Nano](2026-10-06-nano-banana-2-1-cli.md) a 4K/high y ocho referencias;
no certifica catorce referencias, todas las proporciones, MP4/PDF ni todas las combinaciones de endpoints.
Se mantienen `pnpm ai:image` y su default `gpt-image-2`; Sunburst es la elección explícita del flujo cine.
No hubo cambios de runtime, Globe, env, IAM, publicación ni registro de la V2 como receta aprobada.

Cierre de docs y skills: [QA documental](2026-10-06-nexa-nano-documentation-closure.md).
