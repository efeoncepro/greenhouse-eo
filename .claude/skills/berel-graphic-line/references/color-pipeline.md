# Color Berel — catálogo oficial, modelo de imagen y corrector determinista

> Solo Berel. El corrector (`tools/surface-color.mjs`) es neutral y lo puede usar cualquier marca, pero
> **esta** página describe su uso con el catálogo de Berel. Nada de aquí cambia el flujo de Efeonce.
> Fuentes de verdad (Workbench `/Users/jreye/Documents/creative-workbench`): el catálogo local,
> `brands/berel/compose/render.mjs` (`loadCatalog`, `assertColor`), `brands/berel/scripts/ajustar-muro.mjs`,
> `tools/surface-color.mjs`, `tools/marca-color-superficie.mjs` y `brands/berel/contracts/berel-color-evidence.json`.
> Los números son un **snapshot del 2026-11-02**.

## 1. Regla madre

**El color de pintura es un dato del catálogo, no una intención del prompt.** Ningún nombre, código o HEX se
inventa, se estima desde la foto ni se copia de una pieza vieja. El color de una pieza sale del **brief o de la
Wiki de Berel** y se valida contra el catálogo antes de generar, corregir o componer.

## 2. El catálogo oficial

| Qué | Dónde / valor |
|---|---|
| Archivo fuente | `02_Recursos/RGBs Berel_AGENCIAS_2026.xlsx` (2026-10-20), material de agencia de Berel |
| Versión usable | `clients/berel/.resources-local/catalog/berel-colors.json` (schema `berel.color-catalog.v1`) |
| Tamaño | 1.633 colores: **981 vigentes 2026** y 652 *legacy* (del CSV de Notion de 2025) |
| Forma de cada entrada | `code`, `name`, `base`, `family`, `hex`, `palette`, `sources` |
| En Git | **Nunca.** `clients/**/.resources-local/` está ignorado; es recurso licenciado de agencia |

Sin el archivo, el compositor y los scripts fallan cerrado y las pruebas que lo necesitan se saltan.
No hay script de admisión: si falta el catálogo, pídeselo a quien opera Berel; no lo reconstruyas de memoria
ni desde otra fuente (el mensaje de `loadCatalog` lo dice así desde 2026-11-02).

### El par nombre + código falla cerrado

`assertColor(catalog, { name, code })` hace tres comprobaciones, en este orden:

1. El **código** existe → si no: «código X no está en el catálogo oficial de Berel; pídelo a Berel, no lo inventes».
2. No es **legacy** → si lo es: «X solo está en el catálogo 2025 (no en el 2026); confirma con Berel que sigue vigente».
3. El **nombre** coincide con el del código (sin distinguir mayúsculas, locale es-MX) → si no: «"Nombre X": ese código es "Otro"».

Lo usan `prompt-plate.mjs`, `ajustar-muro.mjs` y el compositor. Por qué el par y no solo el código: un código
suelto copiado mal pasa desapercibido; el par cruzado se detecta.

### Error conocido N41

La pieza `N41_BN_INFOGRAFIA_1 (1)` rotuló **«Cazuela de Barro 4-2103T»**, pero `4-2103T` es **Comal**; el
correcto es **Cazuela de Barro 1-3005D**. Quedó como regresión en `brands/berel/test/compose.test.mjs` y en
`knownErrors` de `berel-color-evidence.json`. Si ves ese par en una ficha, corrígelo antes de seguir.

### Evidencia observada ≠ catálogo

`berel-color-evidence.json` guarda **56 pares** leídos en piezas entregadas jun–nov 2026. Sirve para saber qué
colores ya usó Berel; **no** es el catálogo ni trae HEX. Se agregan pares solo desde la Wiki o el brief.

## 3. `color-cercano` sugiere, no decide

```bash
node brands/berel/scripts/color-cercano.mjs <foto> <u> <v>
```

Promedia un parche de 1 % del ancho alrededor de `(u, v)` y devuelve el color medido y los 5 vigentes más
cercanos por ΔE. **No decide**: la luz de la escena (sol, sombra, reflejos) desplaza el color de la foto, así
que el más cercano casi nunca es el que pintaron. Úsalo para orientarte con una foto heredada; el color
rotulado lo decide el brief.

## 4. Por qué un modelo no clava el color

Pregunta del operador (2026-11-01): «Sunburst y Flare no son capaces de poner el color que eliges? debes
pintarlo de forma determinística?». La respuesta medida es **sí, determinista**. Mediciones con el mismo
método (mediana del muro contra el HEX del catálogo, ΔE en Lab), GPT Image 2.5 vía `pnpm ai:image`:

| Cómo se pidió el color | Flare | Sunburst | Fuente |
|---|---|---|---|
| HEX solo en el texto del prompt | 9,9–14,2 | 8,5 | `berel-banners/SKILL.md` (prueba 2026-11-01) |
| Mismo caso, rango global de la primera prueba | 7,7–14,6 (sala, recámara, cocina, ambos modelos) | | Libro §7 y `HARNESS_STATUS.md` |
| **Chip del color como imagen de referencia** (`--image chip.png`) | 9,7 | **5,4** (registro medio) · 7,9 (recámara alta) · 2,4–6,9 (ronda 2, seis espacios) | `berel-banners/SKILL.md`, `HARNESS_STATUS.md` |
| Editar un plate ya hecho pasándole el chip | 11,4 | 8,4 | `berel-banners/SKILL.md` |

Lectura:

- Ninguna vía baja de forma confiable de ΔE 3, que es el umbral de rotular. El chip **ayuda** (Sunburst queda
  más cerca y el corrector mueve menos), pero no es confiable: en el registro alto volvió a 7,9.
- Editar no arregla el color y cuesta lo mismo que generar.
- Sunburst y Flare cuestan lo mismo (≈ USD 0,12 por imagen en `xhigh` 2048×1536). Sunburst respetó mejor las
  reservas de composición, por eso es el de la toma final.

## 5. Receta vigente: Sunburst + chip + corrector

1. **Chip**: PNG plano del HEX del catálogo, `chip-<código>.png`. Los de la ronda real son 1024×1024 de un
   solo color (verificado en `ai-generations/2026-11-01_berel-espacios/ronda-2/chip-1-3605D.png` = `#8E615C`).
   No hay script canónico que lo genere (pendiente); créalo con el HEX que devuelve `assertColor`, nunca con
   uno escrito a mano.
2. **Plate**: Sunburst `xhigh` 2048×1536 con el chip como `--image` y el párrafo del chip al final del prompt
   (comando exacto en [workflow.md](workflow.md) §4).
3. **Corrector**: `ajustar-muro.mjs` lleva la mediana del muro al HEX oficial (§6).
4. **Validar** máscara y ΔE (§7). Solo entonces el plate entra a `clients/berel/.resources-local/photos/`.

## 6. El corrector a fondo

Dos capas, a propósito:

- **Motor neutral** `tools/surface-color.mjs` (`correctSurfaceColor`) + CLI `tools/marca-color-superficie.mjs`.
  Recibe un HEX; no sabe de marcas ni de catálogos. Sin proveedores ni red.
- **Adaptador Berel** `brands/berel/scripts/ajustar-muro.mjs`: valida nombre+código con `assertColor`, saca el
  HEX del catálogo, llama al motor y agrega `brandId` y `color` al `qa.json`.

```bash
node brands/berel/scripts/ajustar-muro.mjs <plate.png> \
  --color "Terra Nova" --codigo 1-3605D \
  --semilla 0.3,0.15 --semilla 0.55,0.25 --semilla 0.7,0.12 --semilla 0.2,0.4 \
  --zona "0,0.03 0.785,0.03 0.785,0.5 0.6,0.5 0.6,0.68 0.34,0.68 0.34,0.5 0,0.5" \
  --out clients/berel/.resources-local/photos/espacios/terraza.png
```

(Semillas y zona reales del plate de terraza vigente, leídas de su `terraza.qa.json`.)

### Qué hace, paso a paso

| Paso | Qué hace | Por qué |
|---|---|---|
| **Semillas** (`--semilla u,v`, repetible, 0–1 sobre la foto) | Mide la mediana Lab en un parche de radio ≈ 1 % del ancho (mínimo 4 px) alrededor de cada semilla: ese es el tono de referencia del muro | Varias semillas en luz y en sombra del mismo muro dan un tono robusto. Ponlas solo sobre muro pintado, nunca sobre objetos |
| **Zona** (`--zona "u,v u,v u,v …"`, polígono ≥ 3 puntos sobre la FOTO) | Fuera del polígono nada cambia. El borde se difumina un 2 % del ancho para no dejar costura | Declara el muro como se declaran los marcadores: sobre la foto, no sobre el formato. Recorta **por encima del mobiliario** y rodea lo que tenga tono parecido |
| **Matiz** (`--matiz`, default **22°**) | Peso pleno a ±22° del tono de referencia; cae a 0 en 22 × 1,35 | El sol y la sombra cambian la luz, no el tono: así entra el muro soleado y el sombreado, y queda fuera lo que tiene otro tono |
| **Croma mínimo** | Peso pleno si el croma ≥ 0,6× el del muro; rampa entre 0,4× y 0,6× | Deja fuera grises y neutros dentro de la zona |
| **Guarda de luces neutras** | Si un píxel es > 14 de L más claro que el muro y menos saturado (< 0,9× croma), su peso cae a 0 entre +14 y +24 | Una pantalla de lámpara o una tela blanca teñida por el reflejo del muro no se pinta; un parche de sol (que gana croma) sí |
| **Desplazamiento aditivo en Lab** | Suma a cada píxel la diferencia mediana→objetivo, ponderada por su luz local (`k` entre 0,4 y 1,25) | Conserva sombra, sol y textura. Multiplicar L amplificaba la textura en rayas; sumar no |
| **QA** | Vuelve a medir la misma máscara sobre el resultado | El número de después sale de la imagen real, no de la cuenta |

Salidas junto a `--out`: `<nombre>.png`, `<nombre>.mascara.png` (blanco = lo que se corrigió) y `<nombre>.qa.json`
(`deltaEBefore`, `deltaEAfter`, `coverage`, `medianBefore`, `medianAfter`, semillas, zona, matiz, color).

### Avisos que imprime

- `⚠ el muro detectado cubre menos del 5 %` → las semillas no están sobre el muro o la zona es muy chica.
- `⚠ ΔE después > 3: revisa la máscara antes de rotular el color` → algo dentro de la zona compite con el muro.

### Qué excluir del polígono

Objetos de **tono parecido** al muro entran por la regla de matiz aunque no sean muro: en la ronda real hubo que
sacar del polígono una **maceta de terracota** y **cojines** del mismo tono. Recorta la zona en «L» o en «U»
alrededor de ellos (como la zona de la terraza de arriba, que deja fuera el mobiliario bajo). Lo que el corrector
no puede separar por tono, lo separas tú con la zona.

## 7. Cómo validar

1. **ΔE mediana después ≤ 3.** Resultados reales al 2026-11-02 (`clients/berel/.resources-local/photos/espacios/*.qa.json`):
   de 2,35–14,15 antes a **0,03–1,17 después**. Los mayores: recámara medio depto 1,17, fachada 0,90, recámara medio
   casa 0,76, recámara Bien y de Buenas 0,73; el resto ≤ 0,30.
2. **Mira la máscara** (`.mascara.png`) junto al plate: el muro entero, sin agujeros raros; los objetos fuera; sin
   costura en el borde de la zona.
3. **Mira el plate al 100 %**: el sol y la sombra siguen ahí, la textura no se rayó, nada fuera del muro cambió.
4. Si algo falla, **ajusta la zona o las semillas y vuelve a correr** (es local y gratis). Nunca rotules un color
   que el muro no tiene.

La mediana mide el muro completo: las zonas en sombra o con sol directo se ven más oscuras o más claras que el chip,
como en una foto real. Eso es correcto; no lo «arregles».

## 8. El corrector es neutral: no se modifica por Berel

`tools/surface-color.mjs` y `tools/marca-color-superficie.mjs` sirven a cualquier marca con catálogo (tienen sus
propias pruebas en `test/surface-color.test.mjs`). Si Berel necesita algo distinto, va en el **adaptador**
(`brands/berel/scripts/ajustar-muro.mjs`) o en sus argumentos, nunca en el motor. El operador lo advirtió al ajustar
Berel: «OJO! esto es solo para Berel cuidado dañas el flujo que usamos para efeonce». Antes de commitear, comprueba
con `git diff --name-only` que no tocaste `tools/`.

## 9. Relación con la grilla del marcador

La grilla busca la celda del marcador midiendo el muro **contra el HEX del catálogo** (≥ 85 % de los píxeles a
ΔE(a,b) ≤ 12 y ΔL ≤ 28). Con un plate corregido funciona sola. Con una foto **sin corregir** (heredada, de Berel)
el muro no coincide con el HEX y hay que declarar `sample: [u, v]` en el job, un punto del muro. Detalle en
[marker-grid.md](marker-grid.md).

## 10. Pendiente

- Script canónico para el chip `chip-<código>.png`.
- Leyenda «Imagen ilustrativa. Los tonos pueden variar…»: ¿obligatoria? (libro §9.3, confirmar con Berel).
