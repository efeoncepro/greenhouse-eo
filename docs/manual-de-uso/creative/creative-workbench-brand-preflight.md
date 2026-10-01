# Preflight de marca en Creative Workbench

> Estado actual 2026-10-01: [continuidad vigente](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md)
> y [manual del Lab](usar-creative-workbench-lab.md). PR14/15/16/17 integrados; revisión técnica 126/126
> completada. Lab v6 publicado en el alias Vercel protegido; UUID y pruebas del demo de abajo son históricos.
> Este manual conserva la prueba fechada del demo y sus UUID inmutables; sus cifras, selecciones y
> pendientes históricos no describen el último renderer/Lab, ni autorizan reejecutar samples como campaña.
> Flujo IA y Efeonce ID siguen separados; no modificar CLIs Greenhouse ni sync total.


## Flujo productivo nativo verificado — 2026-09-30

La prioridad del operador es cerrar composición y adaptaciones antes de continuar con
autenticación. La producción se ejecuta en Workbench, nunca mediante CLIs de Greenhouse.
La prueba local está en `/tmp/cw-sky-production-flow`, dentro de la pieza
`projects/sky/always-on-modular-demo`. Sus cuatro jobs usan `workbench.design-job.v1`, marca
`sky-airline`, pack `0.1.0`, operación `reference.compose` y propósito `internal-proof`.
Cada job declara todos sus campos. El precio `$0` y DEMO son marcadores internos, no una
oferta comercial. `photograph.kind: source-reference` conserva fotografía histórica: no se
generó una fotografía nueva, no se habilitó IA y no hubo llamadas al proveedor.

| Job propio | Fuente y tamaño nativo | Ejecución observada | Revisión y Lab |
| --- | --- | --- | --- |
| job-2630.json | 2026:2630 · 1080×1080 | Completada; cero llamadas al proveedor | PNG revisado; muestra local |
| job-2611.json | 2026:2611 · 1080×1920 | Completada; cero llamadas al proveedor | PNG revisado; muestra local |
| job-4616.json | 2026:4616 · 1080×1350 | Nueva corrida dc16001d completada; cero llamadas al proveedor | PNG limpio verificado; muestra local |
| job-3378.json | 2026:3378 · 728×90 | Completada; cero llamadas al proveedor | PNG revisado; muestra local |

`completed` es el resultado del motor, no una aprobación visual o comercial. El QA de las
cuatro corridas registra `contentSource: complete-declared-fields` y
`commercialApproval: none`. Cada formato conserva geometría y módulos de su fuente exacta;
el contenido nuevo viene del job. No escalar el cuadrado para producir story o banner, ni
heredar textos o información legal del maestro. Una zona ausente continúa ausente; compartir
un componente no comparte una oferta comercial entre formatos.

### 1. Resolver receta, adaptación y todos sus campos

Desde la raíz de Workbench, con el canon instalado por su carril gobernado:

```sh
pnpm marca:recetas sky
pnpm marca:adaptaciones sky node-2026-2630 --plan projects/sky/always-on-modular-demo
pnpm marca:zonas sky node-2026-2630
```

Leer la composición, receta y `textFields` de cada escena. Completar el brief, la pieza y el
job propio. Estos lectores no autorizan producción ni completan la oferta automáticamente.
Declarar fotografía histórica o seleccionar una fotografía propia admitida mediante
`broker-run` y su UUID original; esta segunda vía no quedó certificada por las cuatro corridas.
No usar rutas libres, fotografías de otra persona o marca, fuentes ajenas ni geometría
sobrescrita desde el job.

### 2. Validar y ejecutar cada job explícito

Ejemplo reproducible del cuadrado ya ejecutado; la ruta del job se resuelve desde la raíz:

```sh
pnpm marca:disenar projects/sky/always-on-modular-demo projects/sky/always-on-modular-demo/job-2630.json --validate
pnpm marca:disenar projects/sky/always-on-modular-demo projects/sky/always-on-modular-demo/job-2630.json --execute
```

Para los otros formatos, usar `job-2611.json`, `job-4616.json` o `job-3378.json` en ambos
comandos, uno a uno y bajo el pedido autorizado. Validar no crea una corrida; ejecutar crea
una nueva con inputs, locks, SVG, PNG y QA propios. No sobrescribir corridas anteriores ni
retocar el PNG a mano. El compositor rechaza texto que no cabe antes de asignar una corrida:
`sky-design: <motivo>; field=<ID exacto>; zone=<ID zona>`. Localizar el campo y la zona en el
plan, corregir el texto o elegir otra variante admitida y validar de nuevo. No reducir la
fuente, truncar letras, cambiar colores o coordenadas ni borrar información legal para hacerlo caber.

### 3. Revisar el PNG final y registrar alcance

Abrir `runs/<uuid>/outputs/design.png` completo y revisar recortes de logo, uniones de la
flecha, CTA, textos, información legal, encuadre y contraste. Leer `qa.json` y registrar la
corrida, el SHA del PNG y los hallazgos. La costura del nodo 4616 se corrigió en una nueva
corrida, `dc16001d-13d1-476f-8a82-b68321362f8b`, completada sin llamadas al proveedor.
La revisión del agente principal confirmó el PNG nativo limpio y 16 píxeles de las uniones
en x = 274 y x = 807, con valores RGB 255.

El QA registra `sky-airline.content-arrow` versión `1.0.0` y el método
`single-fill-native-outer-contour`, conservando geometría, color, texto y colocación. Sus hashes:

- `templateSha256`: `1de805b89b509985191d0b24dd215471c2d909bf7af6dec68369e90060e1e513`.
- `compoundPathSha256`: `a6e7dd98c6f85d0bcfc31a18e2c810c0015d8ea05457c345a1f22026a606db60`.

Las 25 admisiones nuevas conservan las 74 anteriores intactas: 99 en total. La corrida
defectuosa `fc4dfeeb-afe3-4ab3-9f9a-3bc4b3dfe850` se preservó sin seleccionar ni editar el
PNG. Las corridas se archivaron con bytes idénticos, fuera de Git, en
`/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-30/always-on-modular-demo/runs/<uuid>`.
Esta corrección modular no modifica la fuente Figma, la fotografía o la autorización comercial.
Si falla un formato, excluirlo de las muestras revisadas; no sustituirlo por otra identidad.

### 4. Compilar snapshot propio y mostrarlo en el Lab

La selección `projects/sky/always-on-modular-demo/lab-selection.json` contiene las cuatro
corridas revisadas, incluida la corrección del nodo 4616 y excluida la corrida defectuosa.
La recarga del Lab en `http://127.0.0.1:4194/` y una captura real confirmaron cuatro muestras:
«Sur · Cuadrado», «Sur · Retrato» (1080 × 1920), «Vuela al sur · Banner» y «Sur · Retrato» (1080 × 1350).
Sus nombres proceden de la intención propia; la fuente «Calama» permanece intacta.

El snapshot `d8045ab5dae18557be6610c9e7a2e5ae502365e7e8705cf37588aa1701a7fcc5` contiene
307 archivos, ninguna fuente licenciada SKY y cinco fuentes host admitidas. El archivo privado
de las cuatro corridas contiene **68 archivos idénticos**, sin la corrida defectuosa. No
inferir contenido nuevo desde títulos o miniaturas de fuente. Esta revisión local no acredita
Vercel, aprobación comercial o publicación.

```sh
CW_PRIMARY_RUN='projects/sky/always-on-reference/runs/6f609e8e-2775-42e5-a318-a69fe5b85252'
CW_KV_PREVIEWS='/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-29/all-adaptations-v4/previews'
pnpm reference:build sky-airline "$CW_PRIMARY_RUN" --kv-exports "$CW_KV_PREVIEWS" --design-runs projects/sky/always-on-modular-demo/lab-selection.json
```

La ruta de previews es privada y local al operador. Resolver su equivalente autorizado en
otra máquina, sin copiar recursos licenciados a Git. El build gobernado verifica marca, locks
y outputs, y devuelve `out` y su digest. Servir únicamente ese directorio en un puerto libre
y revisar nuevamente. Por ejemplo:

```sh
CW_LAB_OUT='/ruta/absoluta/out-devuelto-por-build'
python3 -m http.server 4194 --bind 127.0.0.1 --directory "$CW_LAB_OUT"
```

Sustituir el placeholder por el directorio real verificado. No reutilizar un puerto ocupado
ni ejecutar `astro build` con un payload libre. No editar dentro del snapshot. La corrida
primaria se restauró con bytes idénticos; su outcome histórico no contiene
`executionLockSha256`, por lo que el manifest declara `legacy-not-recorded`. No inventar
ese enlace ni modificar el outcome. Las muestras nuevas tienen sus cadenas propias
comprobadas. Los mismos inputs producen el mismo snapshot; cambiar corrección o selección
exige otro build, sin reescribir el historial.

La verificación integrada local abarcó 243 pruebas del harness en 40 archivos y siete pruebas
SKY en dos archivos: **250 pruebas privadas pasaron, sin omisiones**. En público, 227 pruebas
del harness pasaron y 16 se omitieron; cinco pruebas SKY pasaron y dos se omitieron. El total
es **232 pruebas pasadas y 18 omisiones licenciadas**, sin fallos. Las dos pruebas públicas
nuevas conservan exactamente las 18 omisiones del contrato. Astro comprobó 34 archivos sin
diagnósticos; la comprobación de tipos con TS7 y las 11 pruebas del Lab pasaron. Estos
resultados pertenecen a la unidad productiva local, no a la rama de identidad ni a CI remoto.
No generaron fotografías ni modificaron autenticación.

### Límite operativo y próximo corte

Fotografía nueva, IA pagada, oferta comercial, Vercel y revisión independiente Figma completa
quedan fuera de esta prueba. La autenticación Efeonce ID está diferida: no se creó un cliente
OAuth propio y la base first-party sigue pendiente. El PR 7 permanece draft, con IA apagada
y sin promoción. Priorizar producción no admite bindings adicionales, presupuesto o canaries
de costo. Consultar la [skill de producción](../../../.codex/skills/efeonce-creative-workbench/references/sky-production.md).

## Antecedente histórico de preflight opt-in — 2026-09-29

El bloque siguiente conserva la foundation original y sus comandos/pruebas históricos; no
ejecutarlos desde Greenhouse para operar el harness nativo actual. Fuente activa y contratos:
repo Workbench y su skill.

Estado: foundation local opt-in, TASK-1945. No distribuida al equipo ni conectada a generación IA.

`pnpm marca:preflight projects/<cliente>/<pieza> <request.json>` valida sin producir.
`--run` crea una corrida nueva con lock y copias selladas de sus entradas. El request vive dentro
de la pieza; no admite paths de recursos aportados por el agente. Ejemplo de estructura:

```json
{"brandId":"sky-airline","version":"0.1.0","operation":"compose","resources":["logo"],"producer":"persona"}
```

La versión del ejemplo no está publicada. Los tres packs reales siguen gated; el comando debe
rechazarlos. La persona del request sirve para atribución, no autentica ni concede acceso.

El catálogo gestionado `clients/brands.json` vincula cliente con pack, versión y digest; sólo un
pack admitido permite IDs sellados con marca, versión y procedencia. Ningún fallback está permitido.
La carpeta `runs/<uuid>/inputs/` conserva bytes verificados; `brand.lock.json` registra procedencia,
versión, hashes y contexto. Cambios de pieza/catálogo/pack después del preflight invalidan la corrida.
Los permisos de sólo lectura de los inputs previenen escrituras accidentales; no son una frontera
de seguridad frente al dueño de la máquina. El owner del catálogo es el plano de control Greenhouse.

Para declarar el flujo operativo faltan wrappers que consuman este preflight antes de generar,
verificación de identidad/permisos reales y consumo del lock por los compositores. Las APIs crudas
con credenciales directas pueden eludir este módulo. El QA visual sigue obligatorio para cada pieza.
No usar CLI Efeonce como sustituto cuando un pack SKY o Berel esté gated.

Verificación del código canónico:
`node --test scripts/creative-workbench/brand-context.test.mjs`.
